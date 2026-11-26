// Match the recovered serialized startup state. Active URP light/post passes are not invented.
export function configureRenderingProfile(profile){
 if(profile.version!==1||profile.nativePipeline!=='URP Renderer2DData')throw Error('โปรไฟล์ภาพต้นฉบับไม่ถูกต้อง');
 if(profile.camera.renderPostProcessing!==0||profile.camera.antialiasing!==0||profile.camera.dithering!==0)throw Error('โปรไฟล์ต้นฉบับเปิด postprocessing ที่ยังไม่ได้ map');
 if(profile.scene.Light2D.pointerOccurrences!==0||profile.scene.Volume.pointerOccurrences!==0)throw Error('พบแสงหรือ Volume ในฉากที่ต้อง map เพิ่ม');
 return Object.freeze({sourceVersion:profile.sourceVersion,nativePipeline:profile.nativePipeline,postProcessing:false,postAntialiasing:false,dithering:false,staticSceneLight2DReferences:0,mode:profile.postProcessingMode,scope:profile.scope});
}
