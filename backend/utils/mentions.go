package utils

import (
	"regexp"
	"strings"
)

// ParseMentions extracts @mentions from text
func ParseMentions(text string) []string {
	if text == "" {
		return []string{}
	}

	// Regex to find @mentions (alphanumeric characters after @)
	mentionRegex := regexp.MustCompile(`@(\w+)`)
	matches := mentionRegex.FindAllStringSubmatch(text, -1)

	var mentions []string
	for _, match := range matches {
		if len(match) > 1 {
			mentions = append(mentions, strings.TrimSpace(match[1]))
		}
	}

	return mentions
}

// ExtractMentionedMedia extracts unique mentioned media filenames from text
func ExtractMentionedMedia(text string) []string {
	mentions := ParseMentions(text)

	// Remove duplicates
	seen := make(map[string]bool)
	var uniqueMentions []string

	for _, mention := range mentions {
		if !seen[mention] {
			seen[mention] = true
			uniqueMentions = append(uniqueMentions, mention)
		}
	}

	return uniqueMentions
}

// FormatMentionsForDisplay formats mentions for display with proper highlighting
func FormatMentionsForDisplay(text string) string {
	// This could be enhanced to return HTML or markdown with proper mention formatting
	// For now, just return the original text
	return text
}
