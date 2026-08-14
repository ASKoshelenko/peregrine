from peregrine.dataset import dataset_hash, split_counts


def test_dataset_hash_is_stable():
    assert len(dataset_hash()) == 64
    assert dataset_hash() == dataset_hash()


def test_split_counts_cover_the_contract_set():
    assert split_counts() == {"train": 2, "calibration": 2, "eval": 8}
