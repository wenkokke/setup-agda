module hello-world-dep-lookup where

open import Data.Nat using (ℕ)
open import Data.Vec using (Vec; _∷_)
open import Data.Fin using (Fin; zero; suc)

variable
  A : Set
  n : ℕ

lookup : Vec A n → Fin n → A
lookup (a ∷ as) zero = a
lookup (a ∷ as) (suc i) = lookup as i
