package com.powertoolsride.dynamicpricingservice.service;

import com.powertoolsride.dynamicpricingservice.model.SecretData;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import java.math.BigDecimal;

public class RushHourService {
    private final SecretsManagerClient secretsManager;
    private final ObjectMapper objectMapper;
    private final String secretName;

    public RushHourService() {
        this.secretsManager = SecretsManagerClient.create();
        this.objectMapper = new ObjectMapper();
        this.secretName = System.getenv("RUSH_HOUR_MULTIPLIER_SECRET_NAME");
        if (secretName == null || secretName.isEmpty()) {
            throw new IllegalStateException("RUSH_HOUR_MULTIPLIER_SECRET_NAME environment variable is not set");
        }
    }

    public BigDecimal getRushHourMultiplier() {
        GetSecretValueRequest request = GetSecretValueRequest.builder()
            .secretId(secretName)
            .build();

        GetSecretValueResponse response = secretsManager.getSecretValue(request);
        
        SecretData secretData;
        try {
            secretData = objectMapper.readValue(response.secretString(), SecretData.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize secret data", e);
        }
        
        if (secretData == null) {
            throw new RuntimeException("Failed to deserialize secret data");
        }
        
        return secretData.rushHourMultiplier();
    }
}
