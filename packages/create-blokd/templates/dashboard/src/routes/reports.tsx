export const meta = () => ({
  title: "Reports | Blokd App",
  description: "A static dashboard report route."
});

export const runtime = "none";

export const budget = {
  client: "0kb"
};

export default function Reports() {
  return (
    <section>
      <h1>Reports</h1>
      <p>This route is static and keeps the dashboard client runtime out.</p>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Open tasks</td>
            <td>12</td>
          </tr>
          <tr>
            <td>Response time</td>
            <td>42ms</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
