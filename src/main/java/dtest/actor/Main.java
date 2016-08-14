package dtest.actor;

import dtest.contracts.ITestActor;

public class Main {
    public static void main(String[] args) {
        try {
            ITestActor actor = new TestActor();
            
            while (true) {
                actor.runOneSession();
            }
        } catch (Exception e) {
            // TODO Log exception
            e.printStackTrace();
        }
    }
}
