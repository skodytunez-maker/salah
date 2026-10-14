package com.saadikobilov.salah;
import java.io.File;
import java.net.URL;
public final class SalahLiveUpdatePolicy {
    static final String ORIGIN = "https://skodytunez-maker.github.io";
    static final String BASE = ORIGIN + "/salah/mobile-updates/";
    static final long MAX_ZIP = 100L * 1024 * 1024, MAX_EXPANDED = 180L * 1024 * 1024;
    static final int MAX_ENTRIES = 5000;
    static boolean allowed(URL url) {
        return "https".equals(url.getProtocol()) && "skodytunez-maker.github.io".equals(url.getHost())
            && (url.getPort() == -1 || url.getPort() == 443) && url.getUserInfo() == null
            && url.getPath().startsWith("/salah/mobile-updates/") && url.getRef() == null;
    }
    static boolean accepts(int version,int minimum,int schema,int nativeVersion,int current,int pending,int failed) {
        return schema == 1 && minimum >= 332 && minimum <= nativeVersion && version > current
            && version > pending && version != failed && version < Integer.MAX_VALUE;
    }
    static File entry(File root,String name) throws Exception {
        if (name == null || name.isEmpty() || name.startsWith("/") || name.indexOf(92) >= 0
            || name.contains(":") || name.indexOf(0) >= 0) throw new Exception("Unsafe update entry");
        for(String part : name.split("/")) if(part.equals("..") || part.equals(".") || part.isEmpty()) throw new Exception("Unsafe update entry");
        if(name.matches("(?i).*[.](apk|aab|dex|jar|class|so|jks|keystore|p12|pfx)$")) throw new Exception("Native code is not a web update");
        File file = new File(root,name);
        if(!file.getCanonicalPath().startsWith(root.getCanonicalPath()+File.separator)) throw new Exception("Update path escapes root");
        return file;
    }
}
