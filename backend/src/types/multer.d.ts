declare module 'multer' {
    import { Request } from 'express';
    
    namespace multer {
        interface File extends Express.Multer.File {}
        interface Options {
            storage?: any;
            fileFilter?: any;
            limits?: any;
        }
        type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

        export function diskStorage(arg0: { destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => void; filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => void; }) {
            throw new Error('Function not implemented.');
        }
    }
    
    function multer(options?: multer.Options): any;
    
    export = multer;
}
