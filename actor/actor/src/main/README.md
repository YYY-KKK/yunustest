There's no Java code in here, because the actor project is only defining dependencies to the projects containing the actual code (base, selenium, appium, etc.)

This project also contains an "actor.sample.yaml" file in its resources, which is used as the template config file by the command-line tools.

If you create an "actor.yaml" file in the project's resources, and if there's no actor.yaml config file on disk in the root of the project, this file will be used by default when debugging Java code.