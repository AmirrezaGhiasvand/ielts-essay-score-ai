import pandas as pd

df       = pd.read_csv("data/train.csv")
commented = df[df["Examiner_Comment"].notna() & (df["Examiner_Comment"].str.len() > 0)]

print("Task 1 bands with comments:")
task1 = commented[commented["task_type"] == 1]
print(task1["overall_band"].value_counts().sort_index())
print()

for band in [6.0, 7.0, 8.0]:
    samples = task1[task1["overall_band"] == band]
    if len(samples) == 0:
        print(f"No Task 1 Band {band} examples found")
        continue
    sample = samples.iloc[0]
    print(f"{'='*60}")
    print(f"BAND {band} | TASK 1")
    print(f"QUESTION: {sample['question']}")
    print(f"COMMENT: {sample['Examiner_Comment']}")
    print(f"ESSAY: {sample['essay']}")
    print()