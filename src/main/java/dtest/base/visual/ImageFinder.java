package dtest.base.visual;

import dtest.base.contracts.IImageFinder;
import dtest.base.exceptions.ImageNotFoundException;
import java.awt.Rectangle;
import java.awt.Robot;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferByte;
import java.awt.image.WritableRaster;
import java.io.File;
import java.util.List;
import nu.pattern.OpenCV;
import org.opencv.core.Core;
import org.opencv.core.Core.MinMaxLocResult;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

public class ImageFinder implements IImageFinder {

    static {
        OpenCV.loadShared();
        System.loadLibrary(org.opencv.core.Core.NATIVE_LIBRARY_NAME);
    }

    MatchingMethod matchingMethod;

    public ImageFinder() {
        this.matchingMethod = MatchingMethod.MM_SQUARE_DIFFERENCE;
    }

    /**
     * Converts a BufferedImage to an OpenCV Mat object.
     */
    private Mat buffImageToMat(BufferedImage buffImg) {
        BufferedImage convertedImg = null;

        // Convert the image to TYPE_3BYTE_BGR, if necessary
        if (buffImg.getType() == BufferedImage.TYPE_3BYTE_BGR) {
            convertedImg = buffImg;
        } else {
            convertedImg = new BufferedImage(buffImg.getWidth(), buffImg.getHeight(), BufferedImage.TYPE_3BYTE_BGR);
        }

        convertedImg.getGraphics().drawImage(buffImg, 0, 0, null);

        WritableRaster raster = convertedImg.getRaster();
        DataBufferByte data = (DataBufferByte) raster.getDataBuffer();
        byte[] pixels = data.getData();

        Mat mat = new Mat(buffImg.getHeight(), buffImg.getWidth(), CvType.CV_8UC3);
        mat.put(0, 0, pixels);
        return mat;
    }

    @Override
    public ImageFinderResult findAnyImage(BufferedImage sourceImage, Rectangle sourceRect, List<BufferedImage> templateImages, double desiredAccuracy) {
        ImageFinderResult bestResult = new ImageFinderResult(new Rectangle(100, 100, 100, 100), 0);

        for (BufferedImage templateImage : templateImages) {
            ImageFinderResult result = this.findImage(sourceImage, sourceRect, templateImage, 0);
            if (result.getAccuracy() > bestResult.getAccuracy()) {
                bestResult = result;
            }
        }

        if (bestResult.getAccuracy() < desiredAccuracy) {
            String messagePrefix = templateImages.size() == 1
                    ? "Failed to find the template image"
                    : String.format("Failed to find one of %s template images", templateImages.size());

            throw new ImageNotFoundException(
                    String.format(
                            "%s in the source image at (%s, %s, %s, %s). The best accuracy was %.2f and the desired accuracy was %.2f",
                            messagePrefix,
                            sourceRect.x,
                            sourceRect.y,
                            sourceRect.width,
                            sourceRect.height,
                            bestResult.getAccuracy(),
                            desiredAccuracy), bestResult.getFoundRect(), bestResult.getAccuracy());
        }

        return bestResult;
    }

    @Override
    public ImageFinderResult findImage(Rectangle sourceScreenRect, BufferedImage templateImage, double desiredAccuracy) {
        try {
            BufferedImage capture = new Robot().createScreenCapture(sourceScreenRect);
            Mat sourceMat = buffImageToMat(capture);
            Mat templateMat = buffImageToMat(templateImage);
            return this.findImage(sourceMat, templateMat, desiredAccuracy);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "An error ocurred while trying to find an image on screen at (%s, %s, %s, %s)",
                    sourceScreenRect.x,
                    sourceScreenRect.y,
                    sourceScreenRect.width,
                    sourceScreenRect.height), ex);
        }
    }

    private ImageFinderResult findImage(Mat sourceMat, Mat templateMat, double desiredAccuracy) {
        Mat result = new Mat(sourceMat.rows() - templateMat.rows() + 1, sourceMat.rows() - templateMat.rows() + 1, CvType.CV_32FC1);
        int intMatchingMethod;

        switch (this.matchingMethod) {
            case MM_CORELLATION_COEFF:
                intMatchingMethod = Imgproc.TM_CCOEFF_NORMED;
                break;
            case MM_CROSS_CORELLATION:
                intMatchingMethod = Imgproc.TM_CCORR_NORMED;
                break;
            default:
                intMatchingMethod = Imgproc.TM_SQDIFF_NORMED;
        }

        Imgproc.matchTemplate(sourceMat, templateMat, result, intMatchingMethod);
        MinMaxLocResult minMaxLocRes = Core.minMaxLoc(result);

        double accuracy = 0;
        Point location = null;

        if (this.matchingMethod == MatchingMethod.MM_SQUARE_DIFFERENCE) {
            accuracy = 1 - minMaxLocRes.minVal;
            location = minMaxLocRes.minLoc;
        } else {
            accuracy = minMaxLocRes.maxVal;
            location = minMaxLocRes.maxLoc;
        }

        if (accuracy < desiredAccuracy) {
            throw new ImageNotFoundException(
                    String.format(
                            "Failed to find template image in the source image. The accuracy was %.2f and the desired accuracy was %.2f",
                            accuracy,
                            desiredAccuracy),
                    new Rectangle((int) location.x, (int) location.y, templateMat.width(), templateMat.height()),
                    accuracy);
        }

        if (!minMaxLocResultIsValid(minMaxLocRes)) {
            throw new ImageNotFoundException(
                    "Image find result (MinMaxLocResult) was invalid. This usually happens when the source image is covered in one solid color.",
                    null,
                    null);
        }

        Rectangle foundRect = new Rectangle(
                (int) location.x,
                (int) location.y,
                templateMat.width(),
                templateMat.height());

        return new ImageFinderResult(foundRect, accuracy);
    }

    @Override
    public ImageFinderResult findImage(File sourceImage, File templateImage, double desiredAccuracy) {
        Mat sourceMat = Imgcodecs.imread(sourceImage.getAbsolutePath());
        Mat templateMat = Imgcodecs.imread(templateImage.getAbsolutePath());
        return this.findImage(sourceMat, templateMat, desiredAccuracy);
    }

    @Override
    public ImageFinderResult findImage(Rectangle sourceScreenRect, File templateImage, double desiredAccuracy) {
        try {
            BufferedImage capture = new Robot().createScreenCapture(sourceScreenRect);
            Mat sourceMat = buffImageToMat(capture);
            Mat templateMat = Imgcodecs.imread(templateImage.getAbsolutePath());
            return this.findImage(sourceMat, templateMat, desiredAccuracy);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "An error ocurred while trying to find an image on screen at (%s, %s, %s, %s)",
                    sourceScreenRect.x,
                    sourceScreenRect.y,
                    sourceScreenRect.width,
                    sourceScreenRect.height), ex);
        }
    }

    @Override
    public ImageFinderResult findImage(BufferedImage sourceImage, Rectangle sourceRect, BufferedImage templateImage, double desiredAccuracy) {
        BufferedImage subImage = sourceImage;
        if (sourceRect != null) {
            subImage = sourceImage.getSubimage(
                    sourceRect.x,
                    sourceRect.y,
                    sourceRect.width,
                    sourceRect.height);

        }

        Mat sourceMat = this.buffImageToMat(subImage);
        Mat templateMat = this.buffImageToMat(templateImage);

        return this.findImage(sourceMat, templateMat, desiredAccuracy);
    }

    public MatchingMethod getMatchingMethod() {
        return matchingMethod;
    }

    private boolean minMaxLocResultIsValid(MinMaxLocResult minMaxLocRes) {
        if (minMaxLocRes.minVal == 1
                && minMaxLocRes.maxVal == 1
                && minMaxLocRes.maxLoc.x == 0
                && minMaxLocRes.maxLoc.y == 0
                && minMaxLocRes.minLoc.x == 0
                && minMaxLocRes.minLoc.y == 0) {

            return false;
        } else {
            return true;
        }
    }

    public void setMatchingMethod(MatchingMethod matchingMethod) {
        this.matchingMethod = matchingMethod;
    }
}
