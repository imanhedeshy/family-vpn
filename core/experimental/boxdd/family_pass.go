// AdaTech modifications, 2026. GPL-3.0-or-later.
package main

import (
	"bytes"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

const familyPublicKey = "VEqTRBk83u3h2j9lMyy1etiCzkxzcDAttH+gMDyTjBA="
const familySignatureContext = "AdaTech Family VPN configuration v1\n"

var errFamilyPass = errors.New("a valid, current personal Family VPN pass file is required")
var familyAccountPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$`)
var familyExpiryPattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`)

type familyPass struct {
	AccountID     string
	Configuration string
	Deadline      *time.Time
}

// All three service entry paths (interactive start, managed reload and boot
// restore) must verify the exact signed pass, not just a client-supplied date.
// The trusted key is compiled into the common daemon; the file cannot set it.
func verifyFamilyPass(data []byte, publicKey ed25519.PublicKey, now time.Time) (familyPass, error) {
	bad := func() (familyPass, error) { return familyPass{}, errFamilyPass }
	if len(data) > 1500000 || len(publicKey) != ed25519.PublicKeySize || !utf8.Valid(data) {
		return bad()
	}
	var envelope struct {
		Version   int    `json:"version"`
		Payload   string `json:"payload"`
		Signature string `json:"signature"`
	}
	if json.Unmarshal(data, &envelope) != nil || envelope.Version != 1 {
		return bad()
	}
	payload, err := base64.StdEncoding.Strict().DecodeString(envelope.Payload)
	if err != nil || len(payload) > 1048576 || base64.StdEncoding.EncodeToString(payload) != envelope.Payload || !utf8.Valid(payload) {
		return bad()
	}
	signature, err := base64.StdEncoding.Strict().DecodeString(envelope.Signature)
	if err != nil || len(signature) != ed25519.SignatureSize || base64.StdEncoding.EncodeToString(signature) != envelope.Signature {
		return bad()
	}
	if !ed25519.Verify(publicKey, append([]byte(familySignatureContext), payload...), signature) {
		return bad()
	}
	var document struct {
		Version        int               `json:"version"`
		AccountID      string            `json:"accountID"`
		DisplayName    string            `json:"displayName"`
		Configurations map[string]string `json:"platformConfigurations"`
		ExpiresAt      *string           `json:"expiresAt"`
	}
	var fields map[string]json.RawMessage
	if json.Unmarshal(payload, &document) != nil || json.Unmarshal(payload, &fields) != nil || document.Version != 2 {
		return bad()
	}
	if _, present := fields["configuration"]; present {
		return bad()
	}
	if !familyAccountPattern.MatchString(document.AccountID) || strings.TrimSpace(document.DisplayName) == "" || utf8.RuneCountInString(document.DisplayName) > 80 {
		return bad()
	}
	for _, r := range document.DisplayName {
		if unicode.IsControl(r) {
			return bad()
		}
	}
	if len(document.Configurations) != 4 {
		return bad()
	}
	for _, platform := range []string{"macos", "ios", "windows", "android"} {
		config, present := document.Configurations[platform]
		if !present || !utf8.ValidString(config) {
			return bad()
		}
		var value map[string]json.RawMessage
		if json.Unmarshal([]byte(config), &value) != nil || value == nil || !bytes.HasPrefix(bytes.TrimSpace([]byte(config)), []byte("{")) {
			return bad()
		}
	}
	var deadline *time.Time
	if document.ExpiresAt != nil && *document.ExpiresAt != "" {
		if !familyExpiryPattern.MatchString(*document.ExpiresAt) {
			return bad()
		}
		parsed, err := time.Parse(time.RFC3339, *document.ExpiresAt)
		if err != nil || parsed.Format(time.RFC3339) != *document.ExpiresAt || !now.Before(parsed) {
			return bad()
		}
		deadline = &parsed
	}
	return familyPass{AccountID: strings.ToLower(document.AccountID), Configuration: document.Configurations["windows"], Deadline: deadline}, nil
}

func verifyInstalledFamilyPass(content string, now time.Time) (familyPass, error) {
	key, err := base64.StdEncoding.DecodeString(familyPublicKey)
	if err != nil {
		return familyPass{}, errFamilyPass
	}
	return verifyFamilyPass([]byte(content), ed25519.PublicKey(key), now)
}
