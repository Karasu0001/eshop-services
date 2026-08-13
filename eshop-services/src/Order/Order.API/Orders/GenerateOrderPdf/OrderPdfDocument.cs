using OrderService.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace OrderService.Orders.GenerateOrderPdf
{
    // Comprobante de compra en PDF, estilo "detalle de tu pedido" (Mercado Libre / Amazon):
    // encabezado de marca, tarjetas de datos de la orden/cliente, detalle de productos y
    // resumen de totales en formato etiqueta-valor. Solo usa datos que el sistema realmente
    // tiene (no hay pago ni envio en este proyecto, por eso no se inventan esas secciones).
    public class OrderPdfDocument(Order order) : IDocument
    {
        private static readonly string CurrencyCulture = "en-US";

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(35);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Gracias por tu compra en MaruchanMarket · ").FontColor(Colors.Grey.Medium);
                    text.CurrentPageNumber().FontColor(Colors.Grey.Medium);
                    text.Span(" / ").FontColor(Colors.Grey.Medium);
                    text.TotalPages().FontColor(Colors.Grey.Medium);
                });
            });
        }

        private void ComposeHeader(IContainer container)
        {
            container.Column(column =>
            {
                column.Item().Row(row =>
                {
                    row.RelativeItem().Text("🍜 MaruchanMarket").FontSize(20).Bold().FontColor("#07271D");
                    row.ConstantItem(110).AlignRight().Element(c => StatusBadge(c, order.Status));
                });
                column.Item().PaddingTop(2).Text("Comprobante de compra").FontSize(12).FontColor(Colors.Grey.Darken1);
            });
        }

        private void StatusBadge(IContainer container, OrderStatus status)
        {
            var (label, background, foreground) = status switch
            {
                OrderStatus.Pending => ("Pendiente", "#FDF0C7", "#6B4E00"),
                OrderStatus.Confirmed => ("Confirmada", "#DCEFC9", "#07271D"),
                OrderStatus.Cancelled => ("Cancelada", "#FDECEC", "#D1414A"),
                _ => (status.ToString(), "#F0F0F0", "#000000"),
            };

            container.Background(background).CornerRadius(4).Padding(6).AlignCenter().Text(label).FontSize(9).Bold().FontColor(foreground);
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(18).Column(column =>
            {
                column.Spacing(16);

                // Tarjetas de datos, al estilo de las cajas de "Pago" / "Envio" de Mercado Libre,
                // pero solo con los datos que existen de verdad: orden y cliente.
                column.Item().Row(row =>
                {
                    row.Spacing(12);
                    row.RelativeItem().Element(c => InfoCard(c, "Orden", $"#{order.Id}",
                        order.CreatedAt.ToLocalTime().ToString("dd 'de' MMMM 'de' yyyy, HH:mm",
                            new System.Globalization.CultureInfo("es-MX"))));
                    row.RelativeItem().Element(c => InfoCard(c, "Cliente", order.CustomerId,
                        $"{order.Items.Count} producto(s) en esta orden"));
                });

                column.Item().Text("Detalle de la compra").FontSize(13).Bold().FontColor("#07271D");
                column.Item().BorderBottom(1).BorderColor(Colors.Grey.Lighten2);

                column.Item().Element(ComposeItemsList);

                column.Item().PaddingTop(6).AlignRight().Element(ComposeSummaryCard);
            });
        }

        private void InfoCard(IContainer container, string label, string title, string subtitle)
        {
            container.Background(Colors.Grey.Lighten5).Border(1).BorderColor(Colors.Grey.Lighten2)
                .CornerRadius(4).Padding(10).Column(column =>
            {
                column.Item().Text(label.ToUpperInvariant()).FontSize(8).SemiBold().FontColor(Colors.Grey.Darken1);
                column.Item().PaddingTop(2).Text(title).FontSize(11).Bold();
                column.Item().Text(subtitle).FontSize(9).FontColor(Colors.Grey.Darken1);
            });
        }

        private void ComposeItemsList(IContainer container)
        {
            container.Column(column =>
            {
                foreach (var item in order.Items)
                {
                    column.Item().PaddingVertical(8).BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Row(row =>
                    {
                        row.RelativeItem(4).Column(itemColumn =>
                        {
                            itemColumn.Item().Text(item.ProductName).FontSize(10).SemiBold();
                            itemColumn.Item().Text($"Cantidad: {item.Quantity} · Precio unitario: {FormatMoney(item.UnitPrice)}")
                                .FontSize(8.5f).FontColor(Colors.Grey.Darken1);
                        });
                        row.RelativeItem(1).AlignRight().AlignMiddle().Text(FormatMoney(item.LineTotal)).FontSize(10).SemiBold();
                    });
                }
            });
        }

        private void ComposeSummaryCard(IContainer container)
        {
            container.Width(230).Background(Colors.Grey.Lighten5).Border(1).BorderColor(Colors.Grey.Lighten2)
                .CornerRadius(4).Padding(12).Column(column =>
            {
                SummaryRow(column, "Subtotal", order.Subtotal, bold: false, borderTop: false);
                SummaryRow(column, "Impuestos", order.Tax, bold: false, borderTop: true);
                SummaryRow(column, "Total", order.Total, bold: true, borderTop: true);
            });
        }

        private void SummaryRow(ColumnDescriptor column, string label, decimal value, bool bold, bool borderTop)
        {
            var item = column.Item().PaddingTop(bold ? 6 : 4);
            if (borderTop)
                item = item.PaddingTop(bold ? 10 : 6).BorderTop(1).BorderColor(Colors.Grey.Lighten2);

            item.Row(row =>
            {
                var labelSpan = row.RelativeItem().Text(label).FontSize(bold ? 12 : 10)
                    .FontColor(bold ? Colors.Black : Colors.Grey.Darken2);
                var valueSpan = row.ConstantItem(90).AlignRight().Text(FormatMoney(value)).FontSize(bold ? 12 : 10);
                if (bold)
                {
                    labelSpan.Bold();
                    valueSpan.Bold();
                }
            });
        }

        private static string FormatMoney(decimal value) =>
            value.ToString("C2", System.Globalization.CultureInfo.GetCultureInfo(CurrencyCulture));
    }
}
