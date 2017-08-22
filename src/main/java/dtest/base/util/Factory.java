package dtest.base.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dtest.base.contracts.IImageFinder;
import dtest.base.util.json.BufferedImageSerializer;
import dtest.base.util.json.ScriptObjectMirrorSerializer;
import dtest.base.visual.ImageFinder;
import java.awt.image.BufferedImage;
import jdk.nashorn.api.scripting.ScriptObjectMirror;

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
    
    public static TesseractOcr getTesseractOcr() {
        return new TesseractOcr();
    }
}
