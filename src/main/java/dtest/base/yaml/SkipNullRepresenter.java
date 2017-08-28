/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dtest.base.yaml;

import org.yaml.snakeyaml.introspector.Property;
import org.yaml.snakeyaml.nodes.NodeTuple;
import org.yaml.snakeyaml.nodes.Tag;
import org.yaml.snakeyaml.representer.Representer;

/**
 * A SnakeYAML representer that ignores properties with null values.
 */
public class SkipNullRepresenter extends Representer {

    @Override
    protected NodeTuple representJavaBeanProperty(Object javaBean, Property property, Object propertyValue, Tag customTag) {
        if (propertyValue == null) { 
                return null; 
            } else { 
                return super.representJavaBeanProperty(javaBean, property, propertyValue, customTag); 
            }
    }
}
