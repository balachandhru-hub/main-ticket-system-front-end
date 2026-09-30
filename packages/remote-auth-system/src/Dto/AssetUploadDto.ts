export interface AssetUploadDto{
     id?:string,
    entityType: string,
    entityId: string,
    assetType: string,
    contentType: string | null,
    fileBytes: string,
    fileName: string,
    isSingletonAsset: boolean
   
}