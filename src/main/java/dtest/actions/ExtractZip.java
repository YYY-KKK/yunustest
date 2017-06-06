package dtest.actions;

import dtest.base.TestAction;
import dtest.base.logging.Logger;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.file.Paths;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class ExtractZip extends TestAction {

    @Override
    public void run() {
        super.run();

        String sourceFile = this.readStringArgument("sourceFile");
        String targetFolderName = this.readStringArgument("targetFolder");
        Boolean overwrite = this.readBooleanArgument("overwrite", false);

        byte[] buffer = new byte[1024];

        try {
            File targetFolder = new File(targetFolderName);

            // Make sure target folder exists
            targetFolder.mkdirs();

            ZipInputStream zipInputStream
                    = new ZipInputStream(new FileInputStream(sourceFile));

            ZipEntry zipEntry = zipInputStream.getNextEntry();

            while (zipEntry != null) {
                String fileName = zipEntry.getName();
                File newFile = Paths.get(targetFolderName, fileName).toFile();

                if (newFile.exists() && !overwrite) {
                    throw new RuntimeException(String.format(
                            "File %s already exists. If you want to overwrite existing  files, please set the \"overwrite\" argument to true.",
                            newFile));
                }

                Logger.trace(String.format("Extracting ZIP entry into file  %s...", newFile.getAbsoluteFile()));

                // Make sure parent folder for the current entry exists
                newFile.getParentFile().mkdirs();

                FileOutputStream entryOutputStream = new FileOutputStream(newFile);

                int bytesRead;
                while ((bytesRead = zipInputStream.read(buffer)) > 0) {
                    entryOutputStream.write(buffer, 0, bytesRead);
                }

                entryOutputStream.close();
                zipEntry = zipInputStream.getNextEntry();
            }

            zipInputStream.closeEntry();
            zipInputStream.close();
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to extract ZIP file %s into folder %s",
                    sourceFile,
                    targetFolderName), ex);
        }
    }
}
