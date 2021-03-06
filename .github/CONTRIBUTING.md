# Contributing

## General Guidelines

When contributing to this repository, please first discuss the change you wish to make via issue, email, or any other method with the project maintainers.
This saves time and effort for both the contributor and the maintainers and ensures that the change aligns with the project's design principles and vision.

## <a name="commits"></a> Git Commit Guidelines

We have very precise rules over how our git commit messages can be formatted, borrowed from the [AngularJS project](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines).  This leads to **more
readable messages** that are easy to follow when looking through the **project history**.

### Commit Message Format
Each commit message consists of a **header**, a **body** and a **footer**.  The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
```

For example:
```
feat(actor): tolerate non-string arguments in $log API
fix(server): session info page layout breaks for huge session labels
chore(actor): fix some comments
```

The **scope** section is optional and represents the component/section/subproject that is affected by the commit (e.g. "actor", "server", "selenium", "appium", "site", etc). You can use `*` when the change affects more than a single scope.

The **type** must be one of the following:
* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing
  semi-colons, etc)
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **perf**: A code change that improves performance
* **test**: Adding missing or correcting existing tests
* **chore**: Changes to the build process or auxiliary tools and libraries such as documentation
  generation

The **subject** contains a succinct description of the change:

* use the imperative, present tense (e.g. "change", instead of "changed" or "changes")
* don't capitalize first letter
* no dot (.) at the end

Any line of the commit message cannot be longer 100 characters. This allows the message to be easier
to read on GitHub as well as in various git tools.

## Code Quality

Please strive to produce clean, good quality code. We are not being nitpicky, but things like descriptive names, proper indentation/code layout, good comments, style consistency, etc. are important and neglecting these aspects causes the code quality to deteriorate over time, ultimately affecting all of us that maintain or use the product. When in doubt, please consult the [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) for Java code and the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for JavaScript.

## License

Unless you explicitly state otherwise, any contribution intentionally submitted by you for inclusion in this repository shall be licensed as above, without any additional terms or conditions.