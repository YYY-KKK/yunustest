package dtest.base.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dtest.base.contracts.IImageFinder;
import dtest.base.testdef.TestDefAction;
import dtest.base.util.json.BufferedImageSerializer;
import dtest.base.util.json.ScriptObjectMirrorSerializer;
import dtest.base.visual.ImageFinder;
import dtest.base.yaml.SkipNullRepresenter;
import java.awt.image.BufferedImage;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.nodes.Tag;

public class Factory {

    public static IImageFinder getImageFinder() {
        return new ImageFinder();
    }

    public static Gson getGson() {
        return Factory.getGsonBuilder().create();
    }

    public static GsonBuilder getGsonBuilder() {
        return new GsonBuilder()
                .disableHtmlEscaping()
                .registerTypeAdapter(BufferedImage.class, new BufferedImageSerializer())
                .registerTypeAdapter(ScriptObjectMirror.class, new ScriptObjectMirrorSerializer());
    }

    public static Yaml getYaml() {
        final DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.FLOW);
        options.setPrettyFlow(true);

        SkipNullRepresenter representer = new SkipNullRepresenter();
        representer.addClassTag(TestDefAction.class, Tag.MAP);

        return new Yaml(representer, options);
    }

    public static TesseractOcr getTesseractOcr() {
        return new TesseractOcr();
    }
}
