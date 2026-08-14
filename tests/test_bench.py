import pytest

from peregrine.bench import BenchmarkError, nearest_rank


def test_nearest_rank_uses_ceil_index_rule() -> None:
    samples = [float(value) for value in range(1, 101)]
    assert nearest_rank(samples, 0.50) == 50.0
    assert nearest_rank(samples, 0.95) == 95.0


def test_nearest_rank_rejects_empty_samples() -> None:
    with pytest.raises(BenchmarkError):
        nearest_rank([], 0.95)
