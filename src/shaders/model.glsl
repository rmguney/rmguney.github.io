vec3 modelShade(
    vec3 baseColor,
    vec3 worldNormal,
    vec3 viewNormal,
    vec3 viewDir,
    vec3 lightDir,
    float celLevels,
    float celStrength,
    float celSoftness,
    float celFloor,
    float celCeiling,
    vec3 rimColor,
    float rimPower,
    float rimStrength,
    float saturation
) {
    float lambert = dot(normalize(worldNormal), normalize(lightDir)) * 0.5 + 0.5;
    float bandPos = lambert * celLevels;
    float bandIndex = floor(bandPos);
    float bandStep = smoothstep(0.5 - celSoftness * 0.5, 0.5 + celSoftness * 0.5, bandPos - bandIndex);
    float banded = clamp((bandIndex + bandStep + 0.5) / celLevels, 0.0, 1.0);

    float shade = mix(celFloor, celCeiling, banded);
    vec3 shaded = baseColor * mix(1.0, shade, celStrength);

    float fresnel = pow(1.0 - abs(dot(normalize(viewNormal), normalize(viewDir))), rimPower);

    return applySaturation(shaded + rimColor * fresnel * rimStrength, saturation);
}
