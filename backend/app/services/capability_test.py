import asyncio

from openai import OpenAI

TEST_TIMEOUT = 20

FEATURE_REQUIREMENTS = {
    "assessment": ["chat"],
    "matching": ["chat"],
    "interview": ["chat", "stream"],
    "career": ["chat"],
    "resume": ["chat"],
    "quiz": ["chat"],
}


def _make_client(base_url: str, api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=base_url, timeout=TEST_TIMEOUT)


async def test_chat(client: OpenAI, model: str) -> tuple[bool, str]:
    try:
        resp = await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                model=model,
                messages=[{"role": "user", "content": "Please reply with the word hello"}],
                max_tokens=50,
            ),
            timeout=TEST_TIMEOUT,
        )
        if resp.choices and resp.choices[0].message:
            return True, ""
        return False, "Empty response"
    except Exception as e:
        return False, str(e)[:200]


async def test_stream(client: OpenAI, model: str) -> tuple[bool, str]:
    try:
        def _sync():
            stream = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Say OK"}],
                max_tokens=10,
                stream=True,
            )
            got_chunk = False
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta:
                    got_chunk = True
                    break
            return got_chunk

        result = await asyncio.wait_for(asyncio.to_thread(_sync), timeout=TEST_TIMEOUT)
        return (True, "") if result else (False, "No chunks received")
    except Exception as e:
        return False, str(e)[:200]


async def run_all_tests(base_url: str, api_key: str, model: str, **_kw) -> dict:
    client = _make_client(base_url, api_key)

    chat_ok, chat_err = await test_chat(client, model)
    stream_ok, stream_err = await test_stream(client, model)

    errors = {}
    if not chat_ok:
        errors["chat"] = chat_err
    if not stream_ok:
        errors["stream"] = stream_err

    return {
        "supports_chat": chat_ok,
        "supports_stream": stream_ok,
        "supports_json": chat_ok,
        "supports_embedding": chat_ok,
        "errors": errors,
    }


def get_available_features(
    supports_chat: bool,
    supports_stream: bool,
    supports_json: bool,
    supports_embedding: bool,
) -> dict[str, bool]:
    caps = {
        "chat": supports_chat,
        "stream": supports_stream,
    }
    return {
        feature: all(caps.get(req, False) for req in reqs)
        for feature, reqs in FEATURE_REQUIREMENTS.items()
    }
