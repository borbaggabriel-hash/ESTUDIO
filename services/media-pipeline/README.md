# Media Pipeline (M&E + Diarização + JSON de Dublagem)

Este serviço roda como **worker em background** disparado pelo backend Node (Express) via `/api/media-jobs`.

Ele executa:

1. Extração de áudio (FFmpeg) para WAV mono 16kHz
2. Separação de stems (Demucs) → `vocals`, `drums`, `bass`, `other`
3. Reconstrução e limpeza da trilha **M&E** (soma de stems + denoise/normalização com FFmpeg)
4. Diarização offline (VAD + SpeechBrain embeddings + clustering)
5. Transcrição por segmentos (faster-whisper)
6. Geração de JSON com `id_personagem`, `texto`, `start_time`, `end_time`

## Pré-requisitos

- Python 3.10+
- FFmpeg instalado e disponível no PATH (`ffmpeg -version`) ou via `FFMPEG_PATH`

## Instalar FFmpeg (macOS arm64 sem Homebrew)

Se você não consegue/quer instalar via Homebrew, use o instalador local que baixa um binário e coloca em `services/media-pipeline/bin/ffmpeg`:

```bash
bash services/media-pipeline/scripts/install_ffmpeg_macos_arm64.sh
```

## Restauração M&E (presets + IA opcional)

Variáveis de ambiente:

- `ME_RESTORE_PRESET`: `cinema` (default), `transparent`, `aggressive`
- `ME_RESTORE_PRESET`: sufixo `_ai` ativa `arnndn` se o modelo estiver disponível (ex: `cinema_ai`)
- `ME_CENTER_CANCEL_STRENGTH`: 0.0–1.0 (default 0.85)
- `ME_AI_DENOISE`: `0` (default) ou `1` para ativar `arnndn`
- `RNNOISE_MODEL_PATH`: caminho para o modelo RNNoise (default: `services/media-pipeline/models/rnnoise/sh.rnnn`)

Para baixar o modelo RNNoise padrão:

```bash
bash services/media-pipeline/scripts/download_rnnoise_model.sh
```

## Instalação

```bash
cd services/media-pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Como testar (via UI)

1. Suba o app principal:

```bash
npm run dev
```

2. Abra **HUB ALIGN** e clique em **Experience the Engine** (rota `/hub-align/engine`)
3. Envie um arquivo (MP4/MOV/MP3/WAV) e acompanhe o status

Saídas (quando completar):

- M&E limpa: `public/media-jobs/<jobId>/outputs/me_clean.wav`
- Vocals: `public/media-jobs/<jobId>/outputs/vocals.wav`
- JSON: `public/media-jobs/<jobId>/outputs/dub_script.json`
- Logs do worker: `public/media-jobs/<jobId>/worker.log` e `worker.err.log`

## Como testar (via API)

```bash
curl -F "media=@/caminho/para/video.mp4" http://localhost:5001/api/media-jobs
curl http://localhost:5001/api/media-jobs/<jobId>
```
