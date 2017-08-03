package dtest.base.util;

import java.awt.image.BufferedImage;
import java.util.List;
import java.util.Map;
import net.sourceforge.tess4j.ITessAPI.TessPageIteratorLevel;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.Word;

public class TesseractOcr {

    public static List<Word> getLines(BufferedImage image, Map<String, String> tessVariables) {
        try {
            ITesseract tess = new Tesseract();
            setTessVariables(tess, tessVariables);

            List<Word> words = tess.getWords(image, TessPageIteratorLevel.RIL_TEXTLINE);
            return words;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to do OCR", ex);
        }
    }

    public static List<Word> getLines(BufferedImage image) {
        return getLines(image, null);
    }

    public static String getText(BufferedImage image) {
        try {
            ITesseract tess = new Tesseract();
            return tess.doOCR(image);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to do OCR", ex);
        }
    }

    public static List<Word> getWords(BufferedImage image, Map<String, String> tessVariables) {
        try {
            ITesseract tess = new Tesseract();
            setTessVariables(tess, tessVariables);

            List<Word> words = tess.getWords(image, TessPageIteratorLevel.RIL_WORD);
            return words;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to do OCR", ex);
        }
    }

    public static List<Word> getWords(BufferedImage image) {
        return getWords(image, null);
    }

    private static void setTessVariables(ITesseract tess, Map<String, String> tessVariables) {
        if (tessVariables != null) {
            for (Map.Entry<String, String> variable : tessVariables.entrySet()) {
                tess.setTessVariable(variable.getKey(), variable.getValue());
            }
        }
    }
}
