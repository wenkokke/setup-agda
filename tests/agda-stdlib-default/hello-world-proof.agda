module hello-world-proof where

open import Data.Nat using (ℕ; zero; suc; _+_)
open import Relation.Binary.PropositionalEquality using (_≡_; refl; cong)

+-assoc : Set
+-assoc = ∀ (x y z : ℕ) → x + (y + z) ≡ (x + y) + z

+-assoc-proof : ∀ (x y z : ℕ) → x + (y + z) ≡ (x + y) + z
+-assoc-proof zero y z = refl
+-assoc-proof (suc x) y z = cong suc (+-assoc-proof x y z)
