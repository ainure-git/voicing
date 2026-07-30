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

    [string]$Voice = ''
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
        [string]$Voice
    )
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.Rate = $Rate
    $synth.Volume = $Volume
    if ($Voice -ne '') {
        try {
            $synth.SelectVoice($Voice)
        }
        catch {
            [Console]::Out.WriteLine('WARN voice-not-found')
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
        $synth = New-Synth -Rate $Rate -Volume $Volume -Voice $Voice
        $synth.Speak('Hola. Esta es una prueba de la voz de Terminal Voice Controls.')
        $synth.Dispose()
        exit 0
    }

    'controller' {
        $synth = New-Synth -Rate $Rate -Volume $Volume -Voice $Voice

        # Truly-async stdin reader (StreamReader over the raw stdin stream) so we
        # can poll for commands without blocking the main thread, leaving it free
        # to also poll the synthesizer state for completion.
        $stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
        $readTask = $stdin.ReadLineAsync()

        [Console]::Out.WriteLine('READY')

        $observedSpeaking = $false
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
                            }
                            catch {
                                [Console]::Out.WriteLine('WARN bad-speak')
                            }
                        }
                        'PAUSE' { try { $synth.Pause() } catch { } }
                        'RESUME' { try { $synth.Resume() } catch { } }
                        'STOP' {
                            $observedSpeaking = $false
                            try { $synth.Resume() } catch { }
                            try { $synth.SpeakAsyncCancelAll() } catch { }
                        }
                        'QUIT' { $running = $false }
                        default { }
                    }
                }
                continue                        # process pending input promptly
            }

            # Completion detection: once we have seen the synth speaking, a return
            # to the Ready state means the whole queue drained.
            $state = $synth.State.ToString()
            if ($state -eq 'Speaking') {
                $observedSpeaking = $true
            }
            elseif ($observedSpeaking -and $state -eq 'Ready') {
                $observedSpeaking = $false
                [Console]::Out.WriteLine('EVT done')
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
