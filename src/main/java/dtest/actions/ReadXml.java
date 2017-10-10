package dtest.actions;

import dtest.base.TestAction;
import java.io.File;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathFactory;
import org.w3c.dom.Document;

/**
 * An action that parses XML data and extracts fragments of it based on XPath
 * expressions.
 */
public class ReadXml extends TestAction {

    @Override
    public void run() {
        super.run();

        String filePath = this.readStringArgument("file");
        String xPathString = this.readStringArgument("xPath");

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            File xmlFile = new File(filePath);
            Document doc = builder.parse(xmlFile);
            XPathFactory xPathfactory = XPathFactory.newInstance();
            XPath xpath = xPathfactory.newXPath();
            XPathExpression expr = xpath.compile(xPathString);
            String stringValue = (String)expr.evaluate(doc, XPathConstants.STRING);
            
            this.writeOutput("value", stringValue);
        } catch (Exception ex) {
            throw new RuntimeException(String.format(
                    "Failed to execute XPath expression \"%s\" on XML file \"%s\".",
                    xPathString,
                    filePath), ex);
        }
    }
}
