package com.casestack;

import java.io.File;
import java.io.StringReader;
import java.io.StringWriter;

import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;


public class XSLT {
	
	//Use Saxon as transformer.
	public static void initSaxon() {
        System.setProperty("javax.xml.transform.TransformerFactory",
                           "net.sf.saxon.TransformerFactoryImpl");
	}
	
    /**
     * Transform XSLT from source file to destination file using a XSLT stylesheet.
     * @param sourcePath - Absolute path to source xml file.
     * @param xsltPath - Absolute path to xslt file.
     * @param resultDir - Directory where you want to put resulting files.
     */
	 //USAGE:  XSLT.transformFile("sample-docs/hello.xml", "sample-docs/hello.xsl", "sample-docs/hello-output-java.html");
	public static void transformFile(String sourcePath, String xsltPath, String resultDir) {
        TransformerFactory tFactory = TransformerFactory.newInstance();
        
        try {
            Transformer transformer = tFactory.newTransformer(new StreamSource(new File(xsltPath)));
            transformer.transform(new StreamSource(new File(sourcePath)),
                                  new StreamResult(new File(resultDir)));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Transforms XSLT string.
     * @param sourcePath - Absolute path to source xml file.
     * @param xsltPath - Absolute path to xslt file.
     * @param resultDir - Directory where you want to put resulting files.
     */
    public static String transformString(String input, String xsl) throws Exception {
		StringReader sourceFile = new StringReader(input);
		StringReader styleSheet = new StringReader(xsl);
		StringWriter transformationResult = new StringWriter();
    	
        TransformerFactory tFactory = TransformerFactory.newInstance();
        
        Transformer transformer = tFactory.newTransformer(
        		new StreamSource(styleSheet));
       
        transformer.transform(
                new StreamSource(sourceFile), 
                new StreamResult(transformationResult));

        String result = transformationResult.toString();
        
        return result;
    }
}
