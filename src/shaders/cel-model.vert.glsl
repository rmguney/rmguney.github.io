vCelNormal = normalize(mat3(modelMatrix) * normal);
vCelViewDir = cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz;
