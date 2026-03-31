{
    vec3 celNormal = normalize(vCelNormal);
    float celLight = dot(celNormal, celLightDir) * 0.5 + 0.5;
    float celPos = celLight * celLevels;
    float celIndex = floor(celPos);
    float celStep = smoothstep(1.0 - celSoftness, 1.0, celPos - celIndex);
    float celBanded = (celIndex + celStep + 0.5) / celLevels;
    float celShade = mix(0.72, 1.08, clamp(celBanded, 0.0, 1.0));
    outgoingLight *= mix(1.0, celShade, celStrength);

    float rimFresnel = pow(1.0 - abs(dot(celNormal, normalize(vCelViewDir))), rimPower);
    outgoingLight += rimColor * rimFresnel * rimStrength;
}
