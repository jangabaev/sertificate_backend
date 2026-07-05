import CryptoJS from "crypto-js";

export const deshifr=(chifr)=>{
   return CryptoJS.AES.decrypt(chifr, process.env.JWT_SECRET).toString(
             CryptoJS.enc.Utf8
        );
}