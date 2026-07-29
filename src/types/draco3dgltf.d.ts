declare module 'draco3dgltf' {
    export function createDecoderModule(options?: object): Promise<unknown>;
    export function createEncoderModule(options?: object): Promise<unknown>;
    const draco3dgltf: {
        createDecoderModule: typeof createDecoderModule;
        createEncoderModule: typeof createEncoderModule;
    };
    export default draco3dgltf;
}
