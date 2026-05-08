import json
import logging
import os
import re
import unicodedata
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
else:
    model = None

DEFAULT_MIX_PARAMS: dict[str, Any] = {
    "character_volumes": {},
    "me_volume": 80,
    "dialogue_volume": 100,
    "ducking_intensity": 0.7,
    "notes": "",
}

DUBBING_SYSTEM_PROMPT = """Você é um mixer profissional de dublagem e sua tarefa é sugerir parâmetros de mixagem com base nas informações fornecidas.
Responda APENAS com um objeto JSON válido, sem markdown, sem explicação, sem texto extra.

Informações da sessão:
- Personagens: {characters}
- Descrição da M&E: {me_description}
- Observações do usuário: {notes}

Formato de saída obrigatório:
{{
  "character_volumes": {{}},
  "me_volume": 80,
  "dialogue_volume": 100,
  "ducking_intensity": 0.7,
  "notes": ""
}}

Regras:
- "character_volumes" é um objeto onde cada chave é o nome do personagem e o valor é um número entre 0 e 150 (100 = volume normal)
- "me_volume" controla o volume da faixa M&E (Music & Effects), padrão 80, entre 0 e 150
- "dialogue_volume" controla o volume geral dos diálogos, padrão 100, entre 0 e 150
- "ducking_intensity" é um valor entre 0.0 e 1.0 indicando o quanto a M&E deve ser atenuada durante falas (0 = sem ducking, 1 = atenuação máxima)
- Se houver personagens com voz grave/forte, sugira volume menor (70-90). Personagens com voz fraca/sussurada, sugira volume maior (110-130)
- Se a M&E for intensa ou com muitos efeitos, sugira me_volume menor (60-70) e ducking_intensity maior (0.8-1.0)
- "notes" deve conter uma observação curta e útil sobre a mixagem sugerida, em português
- Se algo estiver ambíguo, use valores padrão conservadores"""


def suggest_mix_params(characters: list[str], me_description: str, notes: str) -> dict:
    characters = [str(c) for c in (characters or [])]
    me_description = (me_description or "").strip()
    notes = (notes or "").strip()

    char_list = ", ".join(characters) if characters else "nenhum personagem informado"
    prompt = DUBBING_SYSTEM_PROMPT.format(
        characters=char_list,
        me_description=me_description or "não informada",
        notes=notes or "nenhuma",
    )

    if model is not None:
        try:
            response = model.generate_content(prompt)
            raw = (getattr(response, "text", "") or "").strip()
            if raw:
                parsed = _extract_json_object(raw)
                return _normalize_mix_params(parsed, characters)
        except Exception as exc:
            logger.info("Gemini indisponível ou resposta inválida; usando fallback local: %s", exc)

    return _fallback_mix_params(characters)


def _normalize_mix_params(data: dict[str, Any], characters: list[str]) -> dict:
    result = DEFAULT_MIX_PARAMS.copy()

    char_vols = data.get("character_volumes")
    if isinstance(char_vols, dict):
        normalized_vols = {}
        for name, vol in char_vols.items():
            clamped = _clamp_float(_coerce_float(vol, 100.0), 0.0, 150.0)
            normalized_vols[str(name)] = round(clamped, 1)
        result["character_volumes"] = normalized_vols
    else:
        result["character_volumes"] = {c: 100.0 for c in characters}

    result["me_volume"] = round(_clamp_float(_coerce_float(data.get("me_volume"), 80.0), 0.0, 150.0), 1)
    result["dialogue_volume"] = round(_clamp_float(_coerce_float(data.get("dialogue_volume"), 100.0), 0.0, 150.0), 1)
    result["ducking_intensity"] = round(_clamp_float(_coerce_float(data.get("ducking_intensity"), 0.7), 0.0, 1.0), 3)
    result["notes"] = str(data.get("notes", "")).strip()[:500]

    for char in characters:
        if char not in result["character_volumes"]:
            result["character_volumes"][char] = 100.0

    return result


def _fallback_mix_params(characters: list[str]) -> dict:
    result = DEFAULT_MIX_PARAMS.copy()
    result["character_volumes"] = {c: 100.0 for c in characters}
    result["notes"] = "Parâmetros padrão aplicados (Gemini indisponível)."
    return result


def _extract_json_object(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    fragment = _find_balanced_json_fragment(text)
    if fragment is not None:
        parsed = json.loads(fragment)
        if isinstance(parsed, dict):
            return parsed

    raise ValueError(f"Não foi possível extrair JSON da resposta do Gemini: {text[:240]}")


def _find_balanced_json_fragment(text: str) -> str | None:
    start = text.find("{")
    while start != -1:
        depth = 0
        in_string = False
        escaped = False

        for index in range(start, len(text)):
            char = text[index]

            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return text[start : index + 1]

        start = text.find("{", start + 1)

    return None


def _coerce_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, bool):
        return float(default)
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return default


def _clamp_float(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))
