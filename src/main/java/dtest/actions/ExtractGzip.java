package dtest.actions;

import dtest.base.TestAction;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.zip.GZIPInputStream;

// TODO: Test this action
public class ExtractGzip extends TestAction {

    @Override
    public void run() {
        super.run();

        String sourceFile = readStringArgument("sourceFile");
        String targetFile = readStringArgument("targetFile");

        try {
            GZIPInputStream gzInputStream
                    = new GZIPInputStream(new FileInputStream(sourceFile));
            FileOutputStream outputStream
                    = new FileOutputStream(targetFile);

            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = gzInputStream.read(buffer)) > 0) {
                outputStream.write(buffer, 0, bytesRead);
            }

            gzInputStream.close();
            outputStream.close();
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to extract data from file %s into file %s",
                    sourceFile,
                    targetFile), ex);
        }
    }
}
