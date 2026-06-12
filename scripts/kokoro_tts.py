from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline


def synthesize(text: str, output_path: str, voice: str) -> None:
    pipeline = KPipeline(lang_code="z", repo_id="hexgrad/Kokoro-82M")
    generator = pipeline(text, voice=voice)

    audio_segments: list[np.ndarray] = []

    for _, _, audio in generator:
        audio_segments.append(audio)

    if not audio_segments:
        raise RuntimeError("Kokoro did not generate audio.")

    full_audio = np.concatenate(audio_segments)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(output), full_audio, 24000)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--voice", default="zf_xiaoyi")
    args = parser.parse_args()
    synthesize(args.text, args.output, args.voice)


if __name__ == "__main__":
    main()
