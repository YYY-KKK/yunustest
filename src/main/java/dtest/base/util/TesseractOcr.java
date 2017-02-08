package dtest.base.util;

import java.awt.image.BufferedImage;
import java.util.List;
import java.util.Map;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.Word;

public class TesseractOcr {

    public static List<Word> getWords(BufferedImage image, Map<String, String> variables) {
        try {

            //RescaleOp rescale = new RescaleOp(3.6f, 20.0f, null);
//            RescaleOp rescale = new RescaleOp(22f, 10.0f, null);
//            image = rescale.filter(image, null);
            ITesseract tess = new Tesseract();

            if (variables != null) {
                for (Map.Entry<String, String> variable : variables.entrySet()) {
                    tess.setTessVariable(variable.getKey(), variable.getValue());
                }
            }

            List<Word> words = tess.getWords(image, 3);
            return words;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to do OCR", ex);
        }
    }

    public static List<Word> getWords(BufferedImage image) {
        return getWords(image, null);
    }

}
