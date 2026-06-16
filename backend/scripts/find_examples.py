import pandas as pd

df = pd.read_csv("data/train.csv")

for band in [6, 6.5, 7, 7.5, 8, 8.5]:
    samples = df[(df["overall_band"] == band) & (df["task_type"] == 2)]
    if len(samples) == 0:
        print(f"No Task 2 Band {band} examples found at all")
        continue
    sample = samples.iloc[0]
    print(f"{'='*60}")
    print(f"BAND {band} | TASK 2 (no examiner comment, band score only)")
    print(f"ESSAY: {sample['essay']}")
    print()