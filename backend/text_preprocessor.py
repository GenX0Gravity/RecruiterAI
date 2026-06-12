import spacy

class TextPreprocessor:
    """
    Normalizes extracted resume text using spaCy.
    Optimized for CPU with the lightweight en_core_web_sm model.
    """
    def __init__(self):
        # Load the small English model. Ensure it is downloaded via:
        # python -m spacy download en_core_web_sm
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            raise OSError(
                "Model 'en_core_web_sm' not found. "
                "Please run: python -m spacy download en_core_web_sm"
            )

    def normalize_text(self, text: str) -> str:
        """
        Tokenizes, lemmatizes, and removes stopwords/punctuation.
        Returns a clean, space-separated string of normalized tokens.
        """
        if not text or not text.strip():
            return ""

        # Process the text using the loaded spaCy model
        # We disable NER and parser since we only need tagger/lemmatizer for this step,
        # which further optimizes CPU execution time.
        doc = self.nlp(text, disable=["ner", "parser"])

        # Filter out stopwords, punctuation, and whitespace
        # Keep lemmas of the remaining valid tokens
        clean_tokens = [
            token.lemma_.lower() 
            for token in doc 
            if not token.is_stop and not token.is_punct and not token.is_space
        ]

        return " ".join(clean_tokens)

if __name__ == "__main__":
    print("Text Preprocessor initialized.")
    # Quick test when running the file directly
    # preprocessor = TextPreprocessor()
    # sample_text = "I am a highly skilled Software Engineer looking for new opportunities in 2026!"
    # print("Original:", sample_text)
    # print("Normalized:", preprocessor.normalize_text(sample_text))
