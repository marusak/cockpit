from task import github, label, labels_of_pull
import task
g = github.GitHub()
for p in g.pulls():
    labels = labels_of_pull(p)
    tests_disabled = "needs-rebase" in labels
    if not tests_disabled:
        label(p, { "labels": labels + ["needs-rebase"] })
        task.comment(p, "Needs to rebase to master since #12367 changed tests names")
