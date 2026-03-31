{
    float celLuma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
    float celPos = celLuma * celLevels;
    float celIndex = floor(celPos);
    float celStep = smoothstep(1.0 - celSoftness, 1.0, celPos - celIndex);
    float celBanded = (celIndex + celStep + 0.5) / celLevels;
    outgoingLight = mix(outgoingLight, outgoingLight * (celBanded / max(celLuma, 1e-4)), celStrength);
}
