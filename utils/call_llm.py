from google import genai
import os
import logging
import json
import requests
import time
from datetime import datetime
import dotenv

dotenv.load_dotenv()


# Configure logging
log_directory = os.getenv("LOG_DIR", "logs")
os.makedirs(log_directory, exist_ok=True)
log_file = os.path.join(
    log_directory, f"llm_calls_{datetime.now().strftime('%Y%m%d')}.log"
)

# Set up logger
logger = logging.getLogger("llm_logger")
logger.setLevel(logging.INFO)
logger.propagate = False  # Prevent propagation to root logger
file_handler = logging.FileHandler(log_file, encoding='utf-8')
file_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
)
logger.addHandler(file_handler)

# Simple cache configuration
cache_file = "llm_cache.json"
_cache_data = None
_provider_cooldowns: dict[str, float] = {}


def _now_ts() -> float:
    return time.time()


def _cooldown_remaining(provider: str) -> int:
    until = _provider_cooldowns.get(provider, 0)
    return max(0, int(until - _now_ts()))


def _set_provider_cooldown(provider: str, seconds: int, reason: str):
    if seconds <= 0:
        return

    _provider_cooldowns[provider] = _now_ts() + seconds
    logger.warning("Provider %s cooling down for %ss: %s", provider, seconds, reason)
    print(f"LLM provider {provider} cooling down for {seconds}s: {reason}")


def _clear_provider_cooldown(provider: str):
    _provider_cooldowns.pop(provider, None)


def _is_verbose_llm_logging_enabled() -> bool:
    return os.getenv("LLM_LOG_FULL_PAYLOAD", "false").strip().lower() in {"1", "true", "yes", "on"}


def load_cache():
    global _cache_data
    if _cache_data is not None:
        return _cache_data

    try:
        with open(cache_file, 'r') as f:
            _cache_data = json.load(f)
            return _cache_data
    except:
        logger.warning(f"Failed to load cache.")
    _cache_data = {}
    return _cache_data


def save_cache(cache):
    global _cache_data
    try:
        with open(cache_file, 'w') as f:
            json.dump(cache, f)
        _cache_data = cache
    except:
        logger.warning(f"Failed to save cache")


def get_llm_provider():
    """
    Return the explicitly requested provider if set.

    Runtime strategy defaults are handled by call_llm(), which now prefers
    OpenRouter first and falls back to Gemini.
    """
    provider = os.getenv("LLM_PROVIDER", "").strip().upper()
    return provider or None


def _is_gemini_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_PROJECT_ID"))


def _is_openrouter_configured() -> bool:
    return bool(os.getenv("OPENROUTER_API_KEY"))


def _get_provider_attempt_order() -> list[str]:
    """
    Provider attempt order:
    - If LLM_PROVIDER is explicitly set to GEMINI/OPENROUTER, honor it first.
    - Otherwise default to GEMINI first, then OPENROUTER fallback.
    - LLM_PROVIDER_PRIORITY (comma-separated) can override default order.
    """
    configured_priority = os.getenv("LLM_PROVIDER_PRIORITY", "").strip()
    default_order = ["GEMINI", "OPENROUTER"]

    if configured_priority:
        parsed = [p.strip().upper() for p in configured_priority.split(",") if p.strip()]
        priority = []
        for p in parsed:
            if p not in priority:
                priority.append(p)
        for p in default_order:
            if p not in priority:
                priority.append(p)
    else:
        priority = default_order

    explicit = get_llm_provider()
    if explicit:
        return [explicit] + [p for p in priority if p != explicit]

    return priority


def _get_healthy_provider_attempt_order() -> list[str]:
    ordered = []
    for provider in _get_provider_attempt_order():
        remaining = _cooldown_remaining(provider)
        if remaining > 0:
            logger.info("Skipping provider %s due to active cooldown (%ss remaining)", provider, remaining)
            print(f"Skipping LLM provider {provider}; cooldown active for {remaining}s.")
            continue
        ordered.append(provider)
    return ordered


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _call_llm_provider(prompt: str, provider: str = "OPENROUTER") -> str:
    """
    Call an LLM provider based on environment variables.
    Environment variables:
    - LLM_PROVIDER: "OLLAMA" or "XAI"
    - <provider>_MODEL: Model name (e.g., OLLAMA_MODEL, XAI_MODEL)
    - <provider>_BASE_URL: Base URL without endpoint (e.g., OLLAMA_BASE_URL, XAI_BASE_URL)
    - <provider>_API_KEY: API key (e.g., OLLAMA_API_KEY, XAI_API_KEY; optional for providers that don't require it)
    The endpoint /v1/chat/completions will be appended to the base URL.
    """
    if _is_verbose_llm_logging_enabled():
        logger.info(f"PROMPT: {prompt}")

    provider = provider.strip().upper()
    if not provider:
        raise ValueError("Provider name is required")

    # Construct the names of the other environment variables
    model_var = f"{provider}_MODEL"
    base_url_var = f"{provider}_BASE_URL"
    api_key_var = f"{provider}_API_KEY"

    # Read the provider-specific variables
    model = os.environ.get(model_var)
    base_url = os.environ.get(base_url_var)
    api_key = os.environ.get(api_key_var, "")  # API key is optional, default to empty string

    # Function to get default base URL if not provided
    if not base_url and provider == "OPENAI":
        base_url = "https://api.openai.com"
    if not base_url and provider == "OPENROUTER":
        base_url = "https://openrouter.ai/api"
    if not model and provider == "OPENROUTER":
        # Default to a free-tier model; can be overridden by OPENROUTER_MODEL.
        model = "meta-llama/llama-3.3-8b-instruct:free"

    # Validate required variables
    if not model:
        raise ValueError(f"{model_var} environment variable is required")
    if not base_url:
        raise ValueError(f"{base_url_var} environment variable is required")
    if provider == "OPENROUTER" and not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is required")

    # Append the endpoint to the base URL
    url = f"{base_url.rstrip('/')}/v1/chat/completions"

    # Configure headers and payload based on provider
    headers = {
        "Content-Type": "application/json",
    }
    if api_key:  # Only add Authorization header if API key is provided
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
    }

    request_timeout = (
        _env_int("LLM_CONNECT_TIMEOUT_SEC", 10),
        _env_int("LLM_READ_TIMEOUT_SEC", 90),
    )

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=request_timeout)
        response_json = response.json()
        if _is_verbose_llm_logging_enabled():
            logger.info("RESPONSE:\n%s", json.dumps(response_json, indent=2))
        #logger.info(f"RESPONSE: {response.json()}")
        response.raise_for_status()
        return response_json["choices"][0]["message"]["content"]
    except requests.exceptions.HTTPError as e:
        error_message = f"HTTP error occurred: {e}"
        try:
            error_details = response.json().get("error", "No additional details")
            error_message += f" (Details: {error_details})"
        except:
            pass
        raise Exception(error_message)
    except requests.exceptions.ConnectionError:
        raise Exception(f"Failed to connect to {provider} API. Check your network connection.")
    except requests.exceptions.Timeout:
        raise Exception(f"Request to {provider} API timed out.")
    except requests.exceptions.RequestException as e:
        raise Exception(f"An error occurred while making the request to {provider}: {e}")
    except ValueError:
        raise Exception(f"Failed to parse response as JSON from {provider}. The server might have returned an invalid response.")

# By default, we Google Gemini 2.5 pro, as it shows great performance for code understanding
def call_llm(prompt: str, use_cache: bool = True) -> str:
    # Log the prompt
    if _is_verbose_llm_logging_enabled():
        logger.info(f"PROMPT: {prompt}")

    # Check cache if enabled
    if use_cache:
        # Load cache from disk
        cache = load_cache()
        # Return from cache if exists
        if prompt in cache:
            if _is_verbose_llm_logging_enabled():
                logger.info(f"RESPONSE: {cache[prompt]}")
            print("LLM cache hit.")
            return cache[prompt]

    response_text = None
    attempt_errors = []
    provider_order = _get_healthy_provider_attempt_order()
    if not provider_order:
        raise Exception(
            "All configured LLM providers are temporarily cooling down after recent failures. "
            "Please retry shortly or switch to a provider with available quota."
        )

    for provider in provider_order:
        try:
            if provider == "OPENROUTER":
                if not _is_openrouter_configured():
                    raise ValueError("OPENROUTER_API_KEY is not configured")
                response_text = _call_llm_provider(prompt, provider="OPENROUTER")
                logger.info("LLM provider used: OPENROUTER")
                print("LLM provider used: OPENROUTER")
                _clear_provider_cooldown(provider)
                break

            if provider == "GEMINI":
                if not _is_gemini_configured():
                    raise ValueError("Gemini credentials are not configured")
                response_text = _call_llm_gemini(prompt)
                logger.info("LLM provider used: GEMINI")
                print("LLM provider used: GEMINI")
                _clear_provider_cooldown(provider)
                break

            # For any other explicitly configured provider, use generic OpenAI-compatible API shape.
            response_text = _call_llm_provider(prompt, provider=provider)
            logger.info(f"LLM provider used: {provider}")
            print(f"LLM provider used: {provider}")
            _clear_provider_cooldown(provider)
            break
        except Exception as e:
            logger.warning(f"Provider {provider} failed: {e}")
            print(f"LLM provider {provider} failed: {e}")
            error_text = str(e).lower()
            if "429" in error_text or "rate limit" in error_text:
                _set_provider_cooldown(
                    provider,
                    _env_int("LLM_PROVIDER_RATE_LIMIT_COOLDOWN_SEC", 900),
                    "rate limit reached",
                )
            elif "503" in error_text or "unavailable" in error_text or "timed out" in error_text:
                _set_provider_cooldown(
                    provider,
                    _env_int("LLM_PROVIDER_UNAVAILABLE_COOLDOWN_SEC", 180),
                    "provider temporarily unavailable",
                )
            elif "failed to connect" in error_text or "no route to host" in error_text or "nodename nor servname" in error_text:
                _set_provider_cooldown(
                    provider,
                    _env_int("LLM_PROVIDER_NETWORK_COOLDOWN_SEC", 180),
                    "network connection failure",
                )
            attempt_errors.append(f"{provider}: {e}")

    if response_text is None:
        raise Exception(
            "All configured LLM providers failed. "
            + " | ".join(attempt_errors)
        )

    # Log the response
    if _is_verbose_llm_logging_enabled():
        logger.info(f"RESPONSE: {response_text}")

    # Update cache if enabled
    if use_cache:
        # Load cache again to avoid overwrites
        cache = load_cache()
        # Add to cache and save
        cache[prompt] = response_text
        save_cache(cache)

    return response_text


def _call_llm_gemini(prompt: str) -> str:
    if os.getenv("GEMINI_API_KEY"):
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    elif os.getenv("GEMINI_PROJECT_ID"):
        client = genai.Client(
            vertexai=True,
            project=os.getenv("GEMINI_PROJECT_ID"),
            location=os.getenv("GEMINI_LOCATION", "us-central1")
        )
    else:
        raise ValueError("Either GEMINI_PROJECT_ID or GEMINI_API_KEY must be set in the environment")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    from google.genai import errors
    
    retry_count = 0
    max_retries = _env_int("GEMINI_MAX_RETRIES", 2)
    base_delay = _env_int("GEMINI_BASE_RETRY_DELAY_SEC", 3)
    max_delay = _env_int("GEMINI_MAX_RETRY_DELAY_SEC", 12)
    
    while retry_count < max_retries:
        try:
            response = client.models.generate_content(
                model=model,
                contents=[prompt]
            )
            return response.text
        except errors.ClientError as e:
            if e.code == 429: # Resource Exhausted
                wait_time = min(base_delay * (2 ** retry_count), max_delay)
                logger.warning(f"Rate limit hit (429). Retrying in {wait_time}s...")
                print(f"Gemini rate limit hit. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                retry_count += 1
            elif e.code == 503:
                wait_time = min(base_delay * (2 ** retry_count), max_delay)
                logger.warning(f"Gemini unavailable (503). Retrying in {wait_time}s...")
                print(f"Gemini unavailable (503). Retrying in {wait_time}s...")
                time.sleep(wait_time)
                retry_count += 1
            else:
                raise e
        except Exception as e:
             # Basic retry for other intermittent errors
            if retry_count < max_retries:
                wait_time = min(base_delay * (2 ** retry_count), max_delay)
                logger.warning(f"Error {e}. Retrying in {wait_time}s...")
                print(f"Gemini transient error. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                retry_count += 1
            else:
                raise e
                
    raise Exception("Max retries exceeded for LLM call")

if __name__ == "__main__":
    test_prompt = "Hello, how are you?"

    # First call - should hit the API
    print("Making call...")
    response1 = call_llm(test_prompt, use_cache=False)
    print(f"Response: {response1}")
