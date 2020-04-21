# Clojure Lint Action (using clj-kondo)

Run clj-kondo and annotate source code changes with results.

# Usage

```yaml
    steps:
    - uses: actions/checkout@v1
    - uses: DeLaGuardo/clojure-lint-action@master
      with:
        clj-kondo-args: --lint src
        # check-name is optional
        check-name: This is a report name
        # secrets.GITHUB_TOKEN is needed here
        # to publish annotations back to github
        # this action is not storing or sending it anywhere
        github_token: ${{ secrets.GITHUB_TOKEN }}
```

![Annotation example](images/annotation.png)

![Check Run example](images/check-run.png)

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
