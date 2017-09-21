package dtest.annotations;

import java.lang.annotation.Repeatable;

@Repeatable(TestActionArguments.class)
public @interface TestActionArgument {
    String name();
    TestArgumentType type();
    String description() default "";
    boolean optional();
}
