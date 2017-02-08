package dtest.base.util;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.Robot;
import java.awt.image.BufferedImage;

public class ImageUtil {

    public static BufferedImage captureImage(Rectangle captureRect) {
        try {
            return new Robot().createScreenCapture(captureRect);
        } catch (Exception ex) {
            throw new RuntimeException(String.format("Failed to capture image in rectangle (%s, %s, %s, %s)",
                    captureRect.x,
                    captureRect.y,
                    captureRect.width,
                    captureRect.height), ex);
        }
    }

    /**
     * Resizes an image using a Graphics2D object backed by a BufferedImage.
     *
     * @param srcImg - Source image to scale
     * @param width - Desired width
     * @param height - Desired height
     * @return - The new resized image
     */
    public static BufferedImage scaleImage(Image srcImg, int width, int height) {
        BufferedImage resizedImg = new BufferedImage(width, height, BufferedImage.TRANSLUCENT);
        Graphics2D g2 = resizedImg.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2.drawImage(srcImg, 0, 0, width, height, null);
        g2.dispose();

        return resizedImg;
    }
}
