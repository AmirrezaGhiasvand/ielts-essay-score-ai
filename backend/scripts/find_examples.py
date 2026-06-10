import pandas as pd

df = pd.read_csv("data/train.csv")
commented = df[df["Examiner_Comment"].notna() & (df["Examiner_Comment"].str.len() > 0)]

for band in [6.0, 7.0, 8.0]:
    sample = commented[commented["overall_band"] == band].iloc[0]
    print(f"{'='*60}")
    print(f"BAND {band} | TASK {sample['task_type']}")
    print(f"COMMENT: {sample['Examiner_Comment']}")
    print(f"ESSAY: {sample['essay']}")
    print()