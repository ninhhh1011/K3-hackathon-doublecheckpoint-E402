from pathlib import Path

from src.core import config


def test_backend_env_file_is_independent_of_working_directory() -> None:
    env_file = Path(config.Settings.model_config["env_file"])
    expected = Path(config.__file__).resolve().parents[2] / ".env"

    assert env_file == expected


def test_openai_key_uses_backend_environment_name() -> None:
    assert config.Settings.model_fields["openai_api_key"].alias == "OPENAI_API_KEY"
