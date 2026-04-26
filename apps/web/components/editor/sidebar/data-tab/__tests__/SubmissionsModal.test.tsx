import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionsModal } from "../SubmissionsModal";

const TEST_SITE_ID = "11111111-1111-4111-8111-111111111111";
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SubmissionsModal", () => {
  it("renders the modal title with the active formId once open", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ submissions: [] }), { status: 200 }));
    render(
      <SubmissionsModal open siteId={TEST_SITE_ID} formId="contact_us" onClose={() => undefined} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("submissions-modal-title")).toHaveTextContent(
        "Submissions: contact_us",
      );
    });
  });

  it("renders the empty-state copy when the rows API returns submissions=[]", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ submissions: [] }), { status: 200 }));
    render(
      <SubmissionsModal open siteId={TEST_SITE_ID} formId="contact_us" onClose={() => undefined} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("submissions-modal-empty")).toBeInTheDocument();
    });
  });

  it("derives table columns as the union of submitted_data keys, in first-seen order, with 'Submitted at' first", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          submissions: [
            {
              id: 9,
              pageSlug: "home",
              submittedData: { email: "z@z.com", message: "first" },
              createdAt: "2026-04-26T16:00:00.000Z",
            },
            {
              id: 8,
              pageSlug: "home",
              submittedData: { email: "a@a.com", phone: "555" },
              createdAt: "2026-04-26T15:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    render(
      <SubmissionsModal open siteId={TEST_SITE_ID} formId="contact_us" onClose={() => undefined} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("submissions-modal-table")).toBeInTheDocument();
    });
    const headers = Array.from(
      screen.getByTestId("submissions-modal-table").querySelectorAll("thead th"),
    ).map((th) => th.textContent);
    expect(headers).toEqual(["Submitted at", "email", "message", "phone"]);
  });

  it("renders an em-dash for cells whose key is missing in a row", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          submissions: [
            {
              id: 1,
              pageSlug: null,
              submittedData: { email: "z@z.com" },
              createdAt: "2026-04-26T16:00:00.000Z",
            },
            {
              id: 2,
              pageSlug: null,
              submittedData: { phone: "555" },
              createdAt: "2026-04-26T15:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    render(
      <SubmissionsModal open siteId={TEST_SITE_ID} formId="contact_us" onClose={() => undefined} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("submissions-modal-row-1")).toBeInTheDocument();
    });
    const row1Cells = screen.getByTestId("submissions-modal-row-1").querySelectorAll("td");
    // [Submitted at, email, phone]: row 1 has email but not phone → phone is —
    expect(row1Cells[2]?.textContent).toBe("—");
    const row2Cells = screen.getByTestId("submissions-modal-row-2").querySelectorAll("td");
    // row 2 has phone but not email → email is —
    expect(row2Cells[1]?.textContent).toBe("—");
  });

  it("renders the error state with a Retry button when the API errors", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    render(
      <SubmissionsModal open siteId={TEST_SITE_ID} formId="contact_us" onClose={() => undefined} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("submissions-modal-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("submissions-modal-retry")).toBeInTheDocument();
  });

  it("does not fire the rows fetch when formId is null (modal closed)", () => {
    render(
      <SubmissionsModal
        open={false}
        siteId={TEST_SITE_ID}
        formId={null}
        onClose={() => undefined}
      />,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
