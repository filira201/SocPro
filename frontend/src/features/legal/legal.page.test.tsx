import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Component as LegalPage } from "./legal.page";

import { renderWithProviders } from "@/shared/lib/test/render-with-providers";
import { ROUTES } from "@/shared/model/routes";

describe("LegalPage", () => {
  test("показывает заглушку «Страница в разработке»", () => {
    // Arrange
    renderWithProviders(<LegalPage />, { initialRoute: ROUTES.LEGAL });

    // Assert
    expect(screen.getByTestId("legal-placeholder")).toHaveTextContent(
      "Страница в разработке"
    );
  });
});
