<#
    Terminal Voice Controls - local TTS worker (Windows / System.Speech).

    Modes:
      controller : long-lived process driven by a line protocol on stdin.
      list       : print installed voices as VOICE<TAB>name<TAB>culture<TAB>gender.
      test       : speak a short Spanish phrase and exit.

    Controller protocol (one command per line on stdin):
      SPEAK <base64-utf8>   queue an utterance
      PAUSE / RESUME        pause / resume
      STOP                  cancel all speech
      QUIT                  exit

    Stdout events emitted by the controller:
      READY                 ready to accept commands
      EVT done              the whole queue finished speaking naturally
      WARN <reason>         non-fatal issue
      ERR <reason>          fatal issue

    The controller polls the synthesizer state on the main thread (which owns a
    PowerShell runspace) instead of using .NET event handlers, because
    System.Speech raises events on background threads that have no runspace,
    which would crash the process.

    Text is ONLY ever received as Base64 over stdin and decoded to a .NET string
    that is passed straight to SpeakAsync. It is never placed on a command line,
    so command injection is not possible.
#>
[CmdletBinding()]
param(
    [ValidateSet('controller', 'list', 'test')]
    [string]$Mode = 'controller',

    [ValidateRange(-10, 10)]
    [int]$Rate = 0,

    [ValidateRange(0, 100)]
    [int]$Volume = 100,

    [string]$Voice = '',

    [string]$Language = ''
)

$ErrorActionPreference = 'Stop'

try {
    Add-Type -AssemblyName System.Speech
}
catch {
    [Console]::Out.WriteLine('ERR no-speech-assembly')
    exit 3
}

function New-Synth {
    param(
        [int]$Rate,
        [int]$Volume,
        [string]$Voice,
        [string]$Language
    )
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.Rate = $Rate
    $synth.Volume = $Volume

    $selected = $false
    if ($Voice -ne '') {
        try {
            $synth.SelectVoice($Voice)
            $selected = $true
        }
        catch {
            [Console]::Out.WriteLine('WARN voice-not-found')
        }
    }

    # When no explicit voice is chosen, honour the preferred language by picking
    # the first installed voice whose culture matches (exact, then prefix).
    if (-not $selected -and $Language -ne '') {
        try {
            $match = $synth.GetInstalledVoices() |
                Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq $Language } |
                Select-Object -First 1
            if (-not $match) {
                $prefix = $Language.Split('-')[0]
                $match = $synth.GetInstalledVoices() |
                    Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name.StartsWith($prefix) } |
                    Select-Object -First 1
            }
            if ($match) {
                $synth.SelectVoice($match.VoiceInfo.Name)
            }
        }
        catch {
            # Fall back to the SAPI default voice.
        }
    }

    return $synth
}

switch ($Mode) {
    'list' {
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        foreach ($v in $synth.GetInstalledVoices()) {
            if ($v.Enabled) {
                $info = $v.VoiceInfo
                [Console]::Out.WriteLine("VOICE`t$($info.Name)`t$($info.Culture.Name)`t$($info.Gender)")
            }
        }
        $synth.Dispose()
        [Console]::Out.WriteLine('END')
        exit 0
    }

    'test' {
        $synth = New-Synth -Rate $Rate -Volume $Volume -Voice $Voice -Language $Language
        $synth.Speak('Hola. Esta es una prueba de la voz de Terminal Voice Controls.')
        $synth.Dispose()
        exit 0
    }

    'controller' {
        $synth = New-Synth -Rate $Rate -Volume $Volume -Voice $Voice -Language $Language

        # Truly-async stdin reader (StreamReader over the raw stdin stream) so we
        # can poll for commands without blocking the main thread, leaving it free
        # to also poll the synthesizer state for completion.
        $stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
        $readTask = $stdin.ReadLineAsync()

        [Console]::Out.WriteLine('READY')

        # Completion is detected by watching the synthesizer state. `$pending`
        # marks that a SPEAK is outstanding; `$readyStreak` counts consecutive
        # Ready polls so that even an utterance shorter than one poll interval is
        # eventually reported done (and speech that has not started yet, briefly
        # Ready, is not reported prematurely).
        $pending = $false
        $readyStreak = 0
        $readyThreshold = 5
        $running = $true

        while ($running) {
            if ($readTask.IsCompleted) {
                $line = $readTask.Result
                if ($null -eq $line) {
                    break                       # stdin closed (EOF)
                }
                $readTask = $stdin.ReadLineAsync()

                if ($line.Length -gt 0) {
                    $spaceIndex = $line.IndexOf(' ')
                    if ($spaceIndex -ge 0) {
                        $command = $line.Substring(0, $spaceIndex)
                        $argument = $line.Substring($spaceIndex + 1)
                    }
                    else {
                        $command = $line
                        $argument = ''
                    }

                    switch ($command) {
                        'SPEAK' {
                            try {
                                $bytes = [Convert]::FromBase64String($argument)
                                $text = [System.Text.Encoding]::UTF8.GetString($bytes)
                                $synth.SpeakAsync($text) | Out-Null
                                $pending = $true
                                $readyStreak = 0
                            }
                            catch {
                                [Console]::Out.WriteLine('WARN bad-speak')
                            }
                        }
                        'PAUSE' { try { $synth.Pause() } catch { } }
                        'RESUME' { try { $synth.Resume() } catch { } }
                        'STOP' {
                            $pending = $false
                            $readyStreak = 0
                            try { $synth.Resume() } catch { }
                            try { $synth.SpeakAsyncCancelAll() } catch { }
                        }
                        'QUIT' { $running = $false }
                        default { }
                    }
                }
                continue                        # process pending input promptly
            }

            # Completion detection: while a SPEAK is pending, Speaking resets the
            # streak; sustained Ready (queue drained) reports done once.
            if ($pending) {
                $state = $synth.State.ToString()
                if ($state -eq 'Speaking') {
                    $readyStreak = 0
                }
                elseif ($state -eq 'Ready') {
                    $readyStreak++
                    if ($readyStreak -ge $readyThreshold) {
                        $pending = $false
                        $readyStreak = 0
                        [Console]::Out.WriteLine('EVT done')
                    }
                }
                else {
                    # Paused (or transitioning): do not accumulate.
                    $readyStreak = 0
                }
            }

            Start-Sleep -Milliseconds 40
        }

        try { $synth.Resume() } catch { }
        try { $synth.SpeakAsyncCancelAll() } catch { }
        try { $synth.Dispose() } catch { }
        try { $stdin.Dispose() } catch { }
        exit 0
    }
}
