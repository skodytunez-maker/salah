package com.saadikobilov.salah;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.util.UUID;

@CapacitorPlugin(name="SalahSupportPhoto")
public class SalahSupportPhotoPlugin extends Plugin {
    private byte[] photo(PluginCall call) {
        String raw = call.getString("data", "");
        if (raw.isEmpty() || raw.length()>819200 || raw.length()%4!=0 || !raw.matches("[A-Za-z0-9+/]+={0,2}")) throw new IllegalArgumentException();
        byte[] data = Base64.decode(raw, Base64.NO_WRAP);
        if (data.length<20 || data.length>614400 || (data[0]&255)!=255 || (data[1]&255)!=216 || (data[data.length-2]&255)!=255 || (data[data.length-1]&255)!=217) throw new IllegalArgumentException();
        BitmapFactory.Options bounds = new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
        BitmapFactory.decodeByteArray(data,0,data.length,bounds);
        if(bounds.outWidth<1 || bounds.outHeight<1 || bounds.outWidth>1600 || bounds.outHeight>1600 || !"image/jpeg".equals(bounds.outMimeType))throw new IllegalArgumentException();
        return data;
    }
    private void write(Uri uri, byte[] data) throws Exception {
        try(OutputStream out=getContext().getContentResolver().openOutputStream(uri,"w")){
            if(out==null)throw new IllegalStateException();out.write(data);out.flush();
        }
    }
    @PluginMethod public void savePhoto(PluginCall call) {
        final byte[] bytes;try{bytes=photo(call);}catch(Exception error){call.reject("invalid_photo");return;}
        if(Build.VERSION.SDK_INT<29){
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/jpeg");
            intent.putExtra(Intent.EXTRA_TITLE,"SALAH-"+UUID.randomUUID()+".jpg");
            getActivity().runOnUiThread(()->{try{startActivityForResult(call,intent,"saveResult");}catch(Exception error){call.reject("save_unavailable");}});return;
        }
        new Thread(()->{
            Uri created=null;
            try{
                ContentValues values=new ContentValues();values.put(MediaStore.Images.Media.DISPLAY_NAME,"SALAH-"+UUID.randomUUID()+".jpg");
                values.put(MediaStore.Images.Media.MIME_TYPE,"image/jpeg");values.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/SALAH");values.put(MediaStore.Images.Media.IS_PENDING,1);
                created=getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);
                if(created==null)throw new IllegalStateException();write(created,bytes);
                ContentValues ready=new ContentValues();ready.put(MediaStore.Images.Media.IS_PENDING,0);
                if(getContext().getContentResolver().update(created,ready,null,null)!=1)throw new IllegalStateException();
                JSObject result=new JSObject();result.put("status","saved");call.resolve(result);
            }catch(Exception error){if(created!=null){try{getContext().getContentResolver().delete(created,null,null);}catch(Exception ignored){}}call.reject("save_failed");}
        },"salah-photo-save").start();
    }
    @ActivityCallback private void saveResult(PluginCall call,ActivityResult result){
        if(call==null)return;
        if(result.getResultCode()!=Activity.RESULT_OK || result.getData()==null || result.getData().getData()==null){JSObject response=new JSObject();response.put("status","cancelled");call.resolve(response);return;}
        Uri uri=result.getData().getData();
        new Thread(()->{try{write(uri,photo(call));JSObject response=new JSObject();response.put("status","saved");call.resolve(response);}catch(Exception error){call.reject("save_failed");}},"salah-photo-document").start();
    }
}
