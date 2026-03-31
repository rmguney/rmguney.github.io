export interface TSLNode {
    readonly isNode?: true;
}

export interface TSLVec4Node extends TSLNode {
    readonly rgb: TSLNode;
    readonly a: TSLNode;
}

export interface TSLShaderFn {
    (args: Record<string, TSLNode>): TSLNode;
    readonly isNode?: true;
}

export declare function wgslFn(code: string, includes?: TSLShaderFn[]): TSLShaderFn;
export declare function glslFn(code: string, includes?: TSLShaderFn[]): TSLShaderFn;

export declare const output: TSLVec4Node;
export declare const normalView: TSLNode;
export declare const normalWorld: TSLNode;
export declare const positionViewDirection: TSLNode;

export declare function vec3(...args: Array<number | TSLNode>): TSLNode;
export declare function vec4(...args: Array<number | TSLNode>): TSLNode;
export declare function float(value: number | TSLNode): TSLNode;
