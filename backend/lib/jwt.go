package lib

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func generateToken(userID string, secret string, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(expiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func GenerateAccessToken(userID string) (string, error) {
	return generateToken(userID, os.Getenv("JWT_SECRET"), 15*time.Minute)
}

func GenerateRefreshToken(userID string) (string, error) {
	return generateToken(userID, os.Getenv("JWT_REFRESH_SECRET"), 7*24*time.Hour)
}

func VerifyToken(tokenStr, secret string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	// Use jwt.MapClaims safely
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, jwt.ErrInvalidKey
	}

	return claims, nil
}

