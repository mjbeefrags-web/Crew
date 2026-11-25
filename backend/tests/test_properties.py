"""Property-based tests for security and money invariants.

Hypothesis explores arbitrary inputs so regressions in token handling or
hashing show up without hand-written permutations.
"""

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from pydantic import SecretStr

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    digest_token,
    hash_password,
    new_refresh_token,
    verify_password,
)

TEST_SETTINGS = Settings(
    _env_file=None,
    jwt_secret=SecretStr("property-test-secret-that-is-long-enough-1234567890"),
)


@given(st.uuids(), st.sampled_from(["customer", "admin", "staff"]))
@settings(max_examples=30, deadline=None)
def test_access_tokens_round_trip(user_id, role):
    token = create_access_token(user_id, role, TEST_SETTINGS)
    payload = decode_access_token(token, TEST_SETTINGS)

    assert payload["sub"] == str(user_id)
    assert payload["role"] == role
    assert payload["type"] == "access"
    assert payload["iss"] == TEST_SETTINGS.jwt_issuer


@given(st.text(max_size=512))
@settings(max_examples=50, deadline=None)
def test_token_digest_is_deterministic_sha256(value):
    digest = digest_token(value)
    assert digest == digest_token(value)
    assert len(digest) == 64
    assert set(digest) <= set("0123456789abcdef")


@given(st.text(max_size=64))
@settings(
    max_examples=3,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow],
)
def test_passwords_only_verify_with_the_original_value(password):
    encoded = hash_password(password)
    assert verify_password(password, encoded) is True
    assert verify_password(f"wrong-{password}", encoded) is False


@given(st.integers(min_value=1, max_value=10))
@settings(max_examples=10, deadline=None)
def test_refresh_tokens_are_unique_and_opaque(_):
    first = new_refresh_token()
    second = new_refresh_token()
    assert first != second
    assert len(first) >= 48
